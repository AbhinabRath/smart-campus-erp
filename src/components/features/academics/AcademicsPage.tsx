'use client';
import { BACKEND_URL } from "@/lib/config";
import React, {
  useEffect,
  useState
} from 'react';
import { useAppStore }
from '@/lib/store';
import api from '@/lib/api';
import {
  Upload,
  FileText,
  Calendar,
  BookOpen,
  GraduationCap,
  Eye,
  Download,
  Trash2,
  FileBadge2,
  Scale
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
export default function AcademicsPage() {
  const { currentUser } =
  useAppStore();

const isAdmin =
  currentUser?.role ===
  'admin';
  const [documents, setDocuments] =
    useState<any[]>([]);

  const [calendar, setCalendar] =
    useState<any>(null);

  const [regulation, setRegulation] =
    useState<any>(null);
  
  const [examType, setExamType] =
  useState('internal1');

  useEffect(() => {

    loadData();

  }, []);
const [uploading, setUploading] =
  useState(false);
  const loadData = async () => {

    try {

      const [
        docsRes,
        calRes,
        regRes
      ] = await Promise.all([
        api.get('/academics/documents'),
        api.get('/academics/calendar'),
        api.get('/academics/regulation')
      ]);

      setDocuments(
        docsRes.data.data || []
      );

      setCalendar(
        calRes.data.data
      );

      setRegulation(
        regRes.data.data
      );

    } catch (err) {

      console.error(err);

    }
  };
  const uploadDocument = async (
  file: File,
  year: number,
  type: 'SYLLABUS' | 'CURRICULUM'
) => {

  try {

    setUploading(true);

    const formData =
      new FormData();

    formData.append(
      'file',
      file
    );

    formData.append(
      'year',
      String(year)
    );

    formData.append(
      'type',
      type
    );

    await api.post(
  '/academics/documents',
  formData,
  {
    headers: {
      'Content-Type':
        'multipart/form-data'
    }
  }
);

    await loadData();

  } finally {

    setUploading(false);

  }
};

const uploadCalendar = async (
  file: File
) => {

  try {

    setUploading(true);

    const formData =
      new FormData();

    formData.append(
      'file',
      file
    );

    await api.post(
      '/academics/calendar',
      formData,
      {
        headers: {
          'Content-Type':
            'multipart/form-data'
        }
      }
    );

    await loadData();

  } catch (err) {

    console.error(err);

  } finally {

    setUploading(false);

  }
};

const uploadRegulation = async (
  file: File
) => {

  try {

    setUploading(true);

    const formData =
      new FormData();

    formData.append(
      'file',
      file
    );

    await api.post(
      '/academics/regulation',
      formData,
      {
        headers: {
          'Content-Type':
            'multipart/form-data'
        }
      }
    );

    await loadData();

  } catch (err) {

    console.error(err);

  } finally {

    setUploading(false);

  }
};

  const getFileUrl = (path: string) => {
  if (!path) return "";

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${BACKEND_URL}${path}`;
};
  const deleteDocument = async (
  id: string
) => {

  if (
    !confirm(
      'Delete this document?'
    )
  ) return;

  await api.delete(
    `/academics/documents/${id}`
  );

  await loadData();
};
const deleteCalendar = async () => {

  if (!calendar) return;

  if (!confirm('Delete academic calendar?'))
    return;

  await api.delete(
    `/academics/calendar/${calendar.id}`
  );

  await loadData();
};
const deleteRegulation = async () => {

  if (!regulation) return;

  if (!confirm('Delete regulation document?'))
    return;

  await api.delete(
    `/academics/regulation/${regulation.id}`
  );

  await loadData();
};

const downloadIdCard = async () => {
  const response = await api.get('/id-card/my', {
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(response.data);
  window.open(url, '_blank');
};

const downloadAdmitCard = async () => {
  const response = await api.get(
    `/admit-card/my?examType=${examType}`,
    {
      responseType: 'blob',
    }
  );

  const url = window.URL.createObjectURL(response.data);
  window.open(url, '_blank');
};

return (

    <div className="space-y-8">

      <div>

        <h2 className="text-2xl font-bold">
          Academics
        </h2>

        <p className="text-muted-foreground">
          Syllabus, Curriculum,
          Academic Calendar &
          Regulations
        </p>

      </div>
      

      {/* SYLLABUS & CURRICULUM */}

      <div className="rounded-3xl border border-emerald-500/20 bg-card/50 backdrop-blur-sm overflow-hidden">

  <div className="p-8 border-b border-border">

    <div className="flex items-center gap-4">

      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
        <BookOpen className="w-7 h-7 text-emerald-400" />
      </div>

      <div>
        <h3 className="text-2xl font-bold">
          Syllabus & Curriculum
        </h3>

        <p className="text-muted-foreground">
          Academic documents for all years
        </p>
      </div>

    </div>

  </div>

  <div className="p-8">

    <div className="grid gap-5">

      {[1,2,3,4].map((year)=>{

        const curriculum =
          documents.find(
            d =>
              d.year === year &&
              d.type === 'CURRICULUM'
          );

        const syllabus =
          documents.find(
            d =>
              d.year === year &&
              d.type === 'SYLLABUS'
          );

        return (

          <div
            key={year}
            className="
              rounded-2xl
              border
              border-border
              p-6
              bg-background/40
              hover:border-emerald-500/40
              transition-all
            "
          >

            <div className="flex justify-between items-center mb-5">

              <div className="flex items-center gap-3">

                <div className="
                  w-12 h-12
                  rounded-xl
                  bg-emerald-500/10
                  flex items-center justify-center
                ">
                  <GraduationCap
                    className="w-6 h-6 text-emerald-400"
                  />
                </div>

                <h4 className="text-xl font-bold">
                  Year {year}
                </h4>

              </div>

            </div>

            <div className="grid md:grid-cols-2 gap-4">

              {/* CURRICULUM */}

              <div className="
                rounded-xl
                border
                border-border
                p-4
              ">

                <p className="font-semibold mb-3">
                  Curriculum
                </p>

                {curriculum ? (

                  <div className="flex gap-2 flex-wrap">

                    <a
                      href={getFileUrl(curriculum.filePath)}
                      target="_blank"
                      className="
                        px-3 py-2 rounded-lg
                        bg-emerald-500/10
                        text-emerald-400
                        flex items-center gap-2
                      "
                    >
                      <Eye size={16}/>
                      View
                    </a>

                    <a
                      href={`/api/academics/download/${curriculum.id}`}
                      className="
                        px-3 py-2 rounded-lg
                        bg-blue-500/10
                        text-blue-400
                        flex items-center gap-2
                      "
                    >
                      <Download size={16}/>
                      Download
                    </a>
                    {isAdmin && (

  <button
  onClick={() =>
    deleteDocument(
      curriculum.id
    )
  }
  className="
    px-3 py-2 rounded-lg
    bg-red-500/10
    text-red-400
    flex items-center gap-2
  "
>
  <Trash2 size={16}/>
  Delete
</button>

)}

                  </div>

                ) : isAdmin ? (

                  <label
                    className="
                      cursor-pointer
                      px-4 py-2
                      rounded-lg
                      bg-emerald-500/10
                      text-emerald-400
                      inline-flex
                      items-center
                      gap-2
                    "
                  >
                    <Upload size={16}/>
                    Upload

                    <input
                      type="file"
                      hidden
                      accept=".pdf"
                      onChange={(e)=>{
                        const file =
                          e.target.files?.[0];

                        if(file){
                          uploadDocument(
                            file,
                            year,
                            'CURRICULUM'
                          );
                        }
                      }}
                    />
                  </label>

                ) : (
                  <span className="text-muted-foreground">
                    Not Uploaded
                  </span>
                )}

              </div>

              {/* SYLLABUS */}

              <div className="
                rounded-xl
                border
                border-border
                p-4
              ">

                <p className="font-semibold mb-3">
                  Syllabus
                </p>

                {syllabus ? (

                  <div className="flex gap-2 flex-wrap">

                    <a
                      href={getFileUrl(syllabus.filePath)}
                      target="_blank"
                      className="
                        px-3 py-2 rounded-lg
                        bg-emerald-500/10
                        text-emerald-400
                        flex items-center gap-2
                      "
                    >
                      <Eye size={16}/>
                      View
                    </a>

                    <a
  href={`/api/academics/download/${syllabus.id}`}
  className="
    px-3 py-2 rounded-lg
    bg-blue-500/10
    text-blue-400
    flex items-center gap-2
  "
>
  <Download size={16}/>
  Download
</a>
                     {isAdmin && (

  <button
    onClick={() =>
      deleteDocument(
        syllabus.id
      )
    }
    className="
      px-3 py-2 rounded-lg
      bg-red-500/10
      text-red-400
      flex items-center gap-2
    "
  >
    <Trash2 size={16}/>
    Delete
  </button>

)}
                  </div>

                ) : isAdmin ? (

                  <label
                    className="
                      cursor-pointer
                      px-4 py-2
                      rounded-lg
                      bg-emerald-500/10
                      text-emerald-400
                      inline-flex
                      items-center
                      gap-2
                    "
                  >
                    <Upload size={16}/>
                    Upload

                    <input
                      type="file"
                      hidden
                      accept=".pdf"
                      onChange={(e)=>{
                        const file =
                          e.target.files?.[0];

                        if(file){
                          uploadDocument(
                            file,
                            year,
                            'SYLLABUS'
                          );
                        }
                      }}
                    />
                  </label>

                ) : (
                  <span className="text-muted-foreground">
                    Not Uploaded
                  </span>
                )}

              </div>

            </div>

          </div>

        );

      })}

    </div>

  </div>

</div>
{(
  currentUser?.role === 'student' ||
  currentUser?.role === 'teacher'
) && (

<div className="rounded-3xl border border-border p-8">

  <div className="flex items-center gap-4 mb-6">

    <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center">
      <FileBadge2 className="w-7 h-7 text-orange-400" />
    </div>

    <div>
      <h3 className="text-xl font-bold">
        Generate Admit Card
      </h3>

      <p className="text-muted-foreground">
        Download examination admit card
      </p>
    </div>

  </div>

  <div className="flex flex-wrap gap-4 items-center mt-6">

    <Select
      value={examType}
      onValueChange={setExamType}
    >
      <SelectTrigger
        className="
          w-[260px]
          h-12
          border-2
          border-orange-500/30
          bg-background
        "
      >
        <SelectValue />
      </SelectTrigger>

      <SelectContent className="bg-background border border-border z-50">

        <SelectItem value="internal1">
          Internal 1 Examination
        </SelectItem>

        <SelectItem value="internal2">
          Internal 2 Examination
        </SelectItem>

      </SelectContent>

    </Select>

    <button
      onClick={downloadAdmitCard}
      type="button"
      className="
        h-12
        px-6
        flex items-center
        rounded-xl
        bg-orange-500
        text-white
        font-semibold
        hover:opacity-90
      "
    >
      Generate PDF
    </button>

  </div>

</div>

)}

{/* Identity Card */}
{(
  currentUser?.role === 'student' ||
  currentUser?.role === 'teacher'
) && (
  <div className="rounded-3xl border border-border p-8">

  <div className="flex items-center gap-4 mb-6">

    <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
      <FileBadge2 className="w-7 h-7 text-cyan-400" />
    </div>

    <div>
      <h3 className="text-xl font-bold">
        Generate ID Card
      </h3>

      <p className="text-muted-foreground">
        Download identity card
      </p>
    </div>

  </div>

  <button
    onClick={downloadIdCard}
    type="button"
    className="
      h-12
      px-6
      inline-flex
      items-center
      rounded-xl
      bg-cyan-500
      text-white
      font-semibold
      hover:opacity-90
    "
  >
    Generate ID Card
  </button>

</div>

)}

      {/* CALENDAR */}

      <div className="rounded-3xl border border-border p-8">

  <div className="flex items-center justify-between">

    <div className="flex items-center gap-4">

      <div className="
        w-14 h-14
        rounded-2xl
        bg-purple-500/10
        flex items-center justify-center
      ">
        <Calendar className="w-7 h-7 text-purple-400"/>
      </div>

      <div>

        <h3 className="text-xl font-bold">
          Academic Calendar
        </h3>

        <p className="text-muted-foreground">
          Semester schedule and events
        </p>

      </div>

    </div>

    {calendar ? (

      <div className="flex gap-3">

        <a
  href={getFileUrl(calendar.filePath)}
  target="_blank"
  className="
    px-4 py-2
    rounded-lg
    bg-emerald-500/10
    text-emerald-400
    flex items-center gap-2
  "
>
  <Eye size={16}/>
  View
</a>

<a
  href={`/api/academics/calendar/download/${calendar.id}`}
  className="
    px-4 py-2
    rounded-lg
    bg-blue-500/10
    text-blue-400
    flex items-center gap-2
  "
>
  <Download size={16}/>
  Download
</a>
       {isAdmin && (

  <button
    onClick={deleteCalendar}
    className="
      px-4 py-2
      rounded-lg
      bg-red-500/10
      text-red-400
      flex items-center gap-2
    "
  >
    <Trash2 size={16}/>
    Delete
  </button>

)}
      </div>

    ) : isAdmin && (

      <label className="cursor-pointer text-purple-400">

        Upload Calendar

        <input
          hidden
          type="file"
          accept=".pdf"
          onChange={(e)=>{
            const file =
              e.target.files?.[0];

            if(file){
              uploadCalendar(file);
            }
          }}
        />

      </label>

    )}

  </div>

</div>

      {/* REGULATIONS */}

      <div className="rounded-3xl border border-border p-8">

  <div className="flex items-center justify-between">

    <div className="flex items-center gap-4">

      <div
        className="
          w-14 h-14
          rounded-2xl
          bg-blue-500/10
          flex items-center justify-center
        "
      >
        <Scale className="w-7 h-7 text-blue-400" />
      </div>

      <div>

        <h3 className="text-xl font-bold">
          Regulations
        </h3>

        <p className="text-muted-foreground">
          College rules, policies and academic regulations
        </p>

      </div>

    </div>

    {regulation ? (

      <div className="flex gap-3">

        <a
          href={getFileUrl(regulation.filePath)}
          target="_blank"
          className="
            px-4 py-2
            rounded-lg
            bg-emerald-500/10
            text-emerald-400
            flex items-center gap-2
          "
        >
          <Eye size={16} />
          View
        </a>

        <a
  href={`/api/academics/regulation/download/${regulation.id}`}
  className="
    px-4 py-2
    rounded-lg
    bg-blue-500/10
    text-blue-400
    flex items-center gap-2
  "
>
  <Download size={16}/>
  Download
</a>

        {isAdmin && (

          <button
  onClick={deleteRegulation}
  className="
    px-4 py-2
    rounded-lg
    bg-red-500/10
    text-red-400
    flex items-center gap-2
  "
>
  <Trash2 size={16}/>
  Delete
</button>

        )}

      </div>

    ) : (

      isAdmin && (

        <label
          className="
            cursor-pointer
            px-4 py-2
            rounded-lg
            bg-blue-500/10
            text-blue-400
            flex items-center gap-2
          "
        >

          <Upload size={16} />
          Upload Regulation

          <input
            hidden
            type="file"
            accept=".pdf"
            onChange={(e) => {

              const file =
                e.target.files?.[0];

              if (file) {

                uploadRegulation(file);

              }

            }}
          />

        </label>

      )

    )}

  </div>

</div>

    </div>
  );
}
